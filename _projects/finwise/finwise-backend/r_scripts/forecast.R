library(jsonlite)

forecast_savings <- function(monthly_savings) {
  monthly_savings <- as.numeric(monthly_savings)
  n <- length(monthly_savings)

  if (n < 2) {
    base <- if (n == 1) monthly_savings[1] else 0
    return(list(predicted = unname(as.list(rep(round(base, 2), 6)))))
  }

  x <- 1:n
  model <- lm(monthly_savings ~ x)

  future_x <- (n + 1):(n + 6)
  predicted <- predict(model, newdata = data.frame(x = future_x))
  predicted <- pmax(predicted, 0)

  list(predicted = unname(as.list(round(predicted, 2))))
}

result_list <- forecast_savings(input_data$monthly_savings)
result <- toJSON(result_list, auto_unbox = TRUE)
